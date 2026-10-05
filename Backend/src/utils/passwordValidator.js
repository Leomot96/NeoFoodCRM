/**
 * Validador de política de contraseñas seguras
 * Requisitos:
 * 1. Mínimo 8 caracteres
 * 2. Al menos una letra minúscula (a-z)
 * 3. Al menos una letra mayúscula (A-Z)
 * 4. Al menos un dígito numérico (0-9)
 * 5. Al menos un carácter especial (ej. !@#$%^&*...)
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'La contraseña es requerida'
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'La contraseña debe tener al menos 8 caracteres'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos una letra minúscula (a-z)'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos una letra mayúscula (A-Z)'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos un número (0-9)'
    };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos un carácter especial (@, $, !, %, *, #, ?, &, etc.)'
    };
  }

  return {
    isValid: true
  };
};

module.exports = {
  validatePassword
};
