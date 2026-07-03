// Utilitaires d'export de rapports
import { RapportData, FormatExport } from '@/types';
import { utils, write, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Exporte un rapport dans le format spécifié
 * @param returnBlob Si true, retourne le Blob au lieu de télécharger
 */
export function exporterRapport(
  rapport: RapportData,
  formatExport: FormatExport,
  returnBlob: boolean | string = false,
  fileName?: string
): Blob | void {
  const nomFichier = typeof returnBlob === 'string' ? returnBlob : (fileName || genererNomFichier(rapport, formatExport));

  switch (formatExport) {
    case 'pdf':
      return exporterPDF(rapport, nomFichier, typeof returnBlob === 'boolean' ? returnBlob : false);
    case 'excel':
      return exporterExcel(rapport, nomFichier, typeof returnBlob === 'boolean' ? returnBlob : false);
    case 'csv':
      return exporterCSV(rapport, nomFichier, typeof returnBlob === 'boolean' ? returnBlob : false);
    case 'json':
      return exporterJSON(rapport, nomFichier, typeof returnBlob === 'boolean' ? returnBlob : false);
  }
}

/**
 * Export PDF avec jsPDF
 */
function exporterPDF(rapport: RapportData, nomFichier: string, returnBlob: boolean = false): Blob | void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // En-tête du rapport
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(rapport.metadata.titre, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(rapport.metadata.description, pageWidth / 2, 28, { align: 'center' });
  
  // Métadonnées
  doc.setFontSize(9);
  const dateGen = format(new Date(rapport.metadata.date_generation), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  doc.text(`Généré le ${dateGen} par ${rapport.metadata.utilisateur_nom}`, 14, 38);
  doc.text(`${rapport.metadata.nb_lignes} ligne(s)`, 14, 43);
  
  // Statistiques (si présentes)
  let yPos = 50;
  if (rapport.statistiques && Object.keys(rapport.statistiques).length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques', 14, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    Object.entries(rapport.statistiques).forEach(([key, value]) => {
      if (typeof value === 'number' || typeof value === 'string') {
        const label = formatLabel(key);
        const valeur = typeof value === 'number' ? formatNumber(value) : value;
        doc.text(`${label}: ${valeur}`, 14, yPos);
        yPos += 4;
      }
    });
    yPos += 5;
  }
  
  // Tableau de données
  if (rapport.donnees.length > 0) {
    const colonnes = Object.keys(rapport.donnees[0]).map(key => ({
      header: formatLabel(key),
      dataKey: key
    }));
    
    const rows = rapport.donnees.map(item => {
      const row: any = {};
      Object.keys(item).forEach(key => {
        row[key] = formatValue(item[key]);
      });
      return row;
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [colonnes.map(c => c.header)],
      body: rows.map(row => colonnes.map(c => row[c.dataKey])),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
  }
  
  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  if (returnBlob) {
    return doc.output('blob');
  } else {
    doc.save(nomFichier);
  }
}

/**
 * Export Excel avec XLSX
 */
function exporterExcel(rapport: RapportData, nomFichier: string, returnBlob: boolean = false): Blob | void {
  const wb = utils.book_new();
  
  // Feuille de métadonnées
  const metaData = [
    ['Titre', rapport.metadata.titre],
    ['Description', rapport.metadata.description],
    ['Date de génération', format(new Date(rapport.metadata.date_generation), 'dd/MM/yyyy HH:mm', { locale: fr })],
    ['Généré par', rapport.metadata.utilisateur_nom],
    ['Nombre de lignes', rapport.metadata.nb_lignes],
    [],
  ];
  
  if (rapport.statistiques) {
    metaData.push(['Statistiques', '']);
    Object.entries(rapport.statistiques).forEach(([key, value]) => {
      if (typeof value === 'number' || typeof value === 'string') {
        metaData.push([formatLabel(key), formatValue(value)]);
      }
    });
  }
  
  const wsMetadata = utils.aoa_to_sheet(metaData);
  utils.book_append_sheet(wb, wsMetadata, 'Métadonnées');
  
  // Feuille de données
  if (rapport.donnees.length > 0) {
    const wsDonnees = utils.json_to_sheet(rapport.donnees);
    utils.book_append_sheet(wb, wsDonnees, 'Données');
  }
  
  if (returnBlob) {
    const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } else {
    writeFile(wb, nomFichier);
  }
}

/**
 * Export CSV
 */
function exporterCSV(rapport: RapportData, nomFichier: string, returnBlob: boolean = false): Blob | void {
  if (rapport.donnees.length === 0) {
    console.warn('Aucune donnée à exporter');
    return;
  }
  
  const headers = Object.keys(rapport.donnees[0]);
  const csvContent = [
    headers.join(','),
    ...rapport.donnees.map(row =>
      headers.map(header => {
        const value = row[header];
        const formatted = formatValue(value);
        // Échapper les virgules et guillemets
        return typeof formatted === 'string' && (formatted.includes(',') || formatted.includes('"'))
          ? `"${formatted.replace(/"/g, '""')}"`
          : formatted;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  if (returnBlob) {
    return blob;
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomFichier;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

/**
 * Export JSON
 */
function exporterJSON(rapport: RapportData, nomFichier: string, returnBlob: boolean = false): Blob | void {
  const json = JSON.stringify(rapport, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  
  if (returnBlob) {
    return blob;
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomFichier;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

/**
 * Génère un nom de fichier basé sur le rapport
 */
function genererNomFichier(rapport: RapportData, formatExport: FormatExport): string {
  const date = format(new Date(), 'yyyyMMdd_HHmmss');
  const type = rapport.metadata.type.replace(/_/g, '-');
  const extension = formatExport === 'excel' ? 'xlsx' : formatExport;
  return `rapport-${type}-${date}.${extension}`;
}

/**
 * Formate un label pour l'affichage
 */
function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formate une valeur pour l'affichage
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Formate un nombre avec séparateurs
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Génère un lien d'export sécurisé avec expiration
 * Durée par défaut: 10 minutes (minimum recommandé: 5 minutes)
 */
export function genererLienExportSecurise(
  rapportId: string,
  formatExport: FormatExport,
  expirationMinutes: number = 10
): string {
  const expirationTime = Date.now() + expirationMinutes * 60 * 1000;
  const token = btoa(`${rapportId}:${formatExport}:${expirationTime}`);
  const url = `${window.location.origin}/rapports/export/${token}`;
  
  console.log('[exportUtils] Génération lien sécurisé:', {
    rapportId,
    format: formatExport,
    expirationMinutes,
    expiresAt: new Date(expirationTime).toISOString(),
    token,
    url
  });
  
  return url;
}

/**
 * Copie un texte dans le presse-papier
 */
/**
 * Copie un texte dans le presse-papier (fallback inclus)
 */
export async function copierDansPressePapier(texte: string): Promise<boolean> {
  // 1. Méthode moderne (préférée)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(texte);
      console.log('Lien copié dans le presse-papier');
      return true;
    } catch (err) {
      console.warn('Clipboard API échouée, fallback activé', err);
    }
  }

  // 2. Fallback old-school (toujours fonctionnel)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = texte;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (success) {
      console.log('Lien copié via fallback');
      return true;
    }
  } catch (err) {
    console.error('Fallback copie échoué', err);
  }

  // 3. Échec total
  alert('Impossible de copier le lien. Sélectionne-le manuellement : ' + texte);
  return false;
}
