import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({
  apiKey: import.meta.env.VITE_MISTRAL_API_KEY
});

// Fonction qui envoie le texte OCR à Mistral
export async function extractFuelDataWithAI(rawText: string) {
  const prompt = `
Tu lis l'extrait OCR suivant et tu renvoies uniquement un objet JSON strictement valide :

Champs attendus :
{
  "station": string | null,
  "date": string | null,
  "litres": number | null,
  "prixTotal": number | null,
  "chauffeur_matricule": string | null,
  "chauffeur_nom": string | null,
  "chauffeur_prenom": string | null,
  "vehicule_immatriculation": string | null,
  "vehicule_marque": string | null
}

Texte OCR :
"""${rawText}"""
`;

  const response = await client.chat.complete({
    model: "mistral-small-latest", // modèle gratuit
    messages: [{ role: "user", content: prompt }]
  });


// ⚠ Normalisation du format Mistral
let raw = response.choices[0].message.content;

// Si c’est un tableau de chunks → on reconstruit la string
if (Array.isArray(raw)) {
  raw = raw
    .filter((chunk: any) => chunk.type === "text") // on ne garde que les textes
    .map((chunk: any) => chunk.text)              // propriété sûre pour type "text"
    .join("");
}
// Retirer les balises ```json ou ``` autour
raw = raw
  .replace(/```json\s*([\s\S]*?)```/g, "$1")
  .replace(/```([\s\S]*?)```/g, "$1")
  .trim();


// Retirer tout texte avant le JSON
const jsonStart = raw.indexOf("{");
const jsonEnd = raw.lastIndexOf("}");
if (jsonStart === -1 || jsonEnd === -1) {
  throw new Error("Impossible de trouver le JSON dans la réponse IA");
}
raw = raw.substring(jsonStart, jsonEnd + 1);

// Maintenant c'est un JSON pur
const aiExtracted = JSON.parse(raw);
console.log(aiExtracted);
return aiExtracted;


}
