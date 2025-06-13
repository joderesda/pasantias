export const formatDateDisplay = (timestamp: number | string): string => {
  let date: Date;
  
  // Manejar diferentes tipos de entrada
  if (typeof timestamp === 'string') {
    // Si es una cadena, intentar parsearla
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    // Si es un número, verificar si está en segundos o milisegundos
    if (timestamp < 10000000000) {
      // Probablemente está en segundos, convertir a milisegundos
      date = new Date(timestamp * 1000);
    } else {
      // Ya está en milisegundos
      date = new Date(timestamp);
    }
  } else {
    // Valor inválido
    return 'Fecha inválida';
  }
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  // Función auxiliar para agregar ceros iniciales
  const padZero = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`;
  };
  
  const day = padZero(date.getDate());
  const month = padZero(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Función adicional para formatear solo la fecha
export const formatDateOnly = (timestamp: number | string): string => {
  let date: Date;
  
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    if (timestamp < 10000000000) {
      date = new Date(timestamp * 1000);
    } else {
      date = new Date(timestamp);
    }
  } else {
    return 'Fecha inválida';
  }
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  const padZero = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`;
  };
  
  const day = padZero(date.getDate());
  const month = padZero(date.getMonth() + 1);
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Función para convertir timestamp a formato ISO para inputs de fecha
export const formatDateForInput = (timestamp: number | string): string => {
  let date: Date;
  
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    if (timestamp < 10000000000) {
      date = new Date(timestamp * 1000);
    } else {
      date = new Date(timestamp);
    }
  } else {
    return '';
  }
  
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return date.toISOString().split('T')[0];
};