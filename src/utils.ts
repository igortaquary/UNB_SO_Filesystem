// Soma todos os atributos de um objeto
export function sumObjectValues(obj: {[s: string]: number}) {
  return Object.values(obj).reduce( (p, c) => p+c )
}

// Usada para alocacao contigua
// Retorna se tem espaço contiguo suficiente
export function findObjectValueGte(obj: {[s: string]: number}, value: number) {
  const i = Object.values(obj).findIndex( v => v >= value )
  return i > -1 ? Object.keys(obj).at(i) : undefined
}

// Atualiza um objeto dentro de uma array
export function updateObjectInArray(array: Object[], index: number, valuesToUpdate: Object) {
  array[index] = {...array[index], ...valuesToUpdate}
  return array
}