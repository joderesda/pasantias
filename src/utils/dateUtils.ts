export const formatDateDisplay = (timestamp: number): string => {
  const date = new Date(timestamp);
  
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