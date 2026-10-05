/**
 * Validador de política de contraseñas seguras para el Frontend
 * Requisitos:
 * 1. Mínimo 8 caracteres
 * 2. Al menos una letra minúscula (a-z)
 * 3. Al menos una letra mayúscula (A-Z)
 * 4. Al menos un dígito numérico (0-9)
 * 5. Al menos un carácter especial (ej. !@#$%^&*...)
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'La contraseña es requerida',
      checks: {
        length: false,
        lowercase: false,
        uppercase: false,
        number: false,
        special: false
      }
    };
  }

  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  const isValid = Object.values(checks).every(Boolean);

  let message = '';
  if (!checks.length) {
    message = 'La contraseña debe tener al menos 8 caracteres';
  } else if (!checks.lowercase) {
    message = 'La contraseña debe contener al menos una letra minúscula (a-z)';
  } else if (!checks.uppercase) {
    message = 'La contraseña debe contener al menos una letra mayúscula (A-Z)';
  } else if (!checks.number) {
    message = 'La contraseña debe contener al menos un número (0-9)';
  } else if (!checks.special) {
    message = 'La contraseña debe contener al menos un carácter especial (@, $, !, %, *, #, ?, &, etc.)';
  }

  return {
    isValid,
    message,
    checks
  };
};
