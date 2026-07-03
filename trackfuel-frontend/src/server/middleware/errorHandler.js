/**
 * Middleware de gestion centralisée des erreurs
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erreur de validation Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  // Erreur MySQL
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          error: 'Duplicate entry',
          message: 'Cette entrée existe déjà'
        });
      case 'ER_NO_REFERENCED_ROW_2':
        return res.status(400).json({
          error: 'Foreign key constraint',
          message: 'Référence invalide'
        });
      case 'ER_ROW_IS_REFERENCED_2':
        return res.status(409).json({
          error: 'Cannot delete',
          message: 'Impossible de supprimer, des références existent'
        });
      default:
        return res.status(500).json({
          error: 'Database error',
          message: err.sqlMessage || err.message
        });
    }
  }

  // Erreur générique
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
