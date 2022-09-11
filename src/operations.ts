import { AllocationType, DiskFile, FileOperation, Process } from "./typings";
import { findObjectValueGte, sumObjectValues } from "./utils";

export function createFile(disk: DiskFile[], allocationType: AllocationType, process: Process, operation: FileOperation) {
  // Obtem os espaços livres no disco
  const freeDiskSpaces = getFreeDiskSpaces(disk)
  switch (allocationType) {
    case AllocationType.CONTIGUA:
      // Verifica se tem espaço continuo disponivel
      const availableIndex = findObjectValueGte( freeDiskSpaces, operation.size )
      if(availableIndex === undefined)
        throw new Error("Falta de espaço em disco para alocação contigua.");
      return contiguousCreate(disk, operation, availableIndex)

    case AllocationType.ENCADEADA: 
      // Verifica se tem espaço total disponivel
      if( operation.size > sumObjectValues( freeDiskSpaces ) ) 
        throw new Error("Falta de espaço em disco");

      return chainedCreate(disk, operation)

    case AllocationType.INDEXADA:
      // Verifica se tem espaço disponivel
      if( operation.size > sumObjectValues( freeDiskSpaces ) ) 
        throw new Error("Falta de espaço em disco");

      return indexedCreate(disk, operation)
  
    default:
      throw new Error("Tipo de alocação do arquivo não conhecida");

  }
}

function contiguousCreate(disk: DiskFile[], operation: FileOperation, firstIndex: string) {
  for (let index = Number(firstIndex); index < (Number(firstIndex) + operation.size); index++) {
    disk[index] = {
      name: operation.name,
      allocationType: AllocationType.CONTIGUA,
      created_by: operation.process_id
    }
  }
  return disk
}

function chainedCreate(disk: DiskFile[], operation: FileOperation) {
  // Tamanho final do arquivo (somado com os 10%)
  const total_size = operation.size + Math.ceil(operation.size / 10);
  for (let block = 0; block < total_size; block++) {
    const freeIndex = disk.findIndex( b => b.name === "0");
    const nextFreeIndex = block >= total_size ? 
      undefined : disk.findIndex( (b,i) => (b.name === "0" && i > freeIndex ))
    
    if(nextFreeIndex === -1)
      throw new Error("Falta de espaço em disco");
    
    disk[freeIndex] = {
      name: operation.name,
      created_by: operation.process_id,
      allocationType: AllocationType.ENCADEADA,
      nextBlock: nextFreeIndex
    }
  }
  return disk
}

function indexedCreate(disk: DiskFile[], operation: FileOperation) {
  // !!! IMPLEMENTAR LOGICA CRIAÇÃO INDEXADA
  return disk
}

function getFreeDiskSpaces(disk: DiskFile[]) {
  const result = {};
  let initialIndex = undefined;
  const onlyNamesDisk = disk.map( f => f.name )
  for (let index = 0; index < onlyNamesDisk.length; index++) {
    const value = onlyNamesDisk[index];
    if(value === "0") {
      if(initialIndex !== undefined) {
        result[initialIndex] += 1;
      } else {
        result[index] = 1;
        if(onlyNamesDisk[index + 1] === "0") {
          initialIndex = index
        }
      }
    }
  }
  return result
}

/* OPERAÇÕES DE DELEÇÃO */
export function deleteFile(disk: DiskFile[], process: Process, operation: FileOperation) {
  
  const fileFirstIndex = disk.findIndex( file => file.name[0] === operation.name )
  if(fileFirstIndex === -1) throw new Error("O arquivo não foi encontrado para deleção");
  const fileFirstBlock = disk[fileFirstIndex]

  // Verifica permissão para deletar arquivo
  if( process.priority !== 0 && (fileFirstBlock.created_by !== process.id ))
    throw new Error("O processo não tem permissão para deletar o arquivo");

  // Realiza deleção a depender do tipo de como o arquivo foi alocado
  switch (fileFirstBlock.allocationType) {
    case AllocationType.CONTIGUA:
      return contiguousDelete(disk, fileFirstIndex, operation.name);

    case AllocationType.ENCADEADA:
      return chainedDelete(disk, fileFirstIndex, operation.name);

    case AllocationType.INDEXADA:
      return indexedDelete(disk, fileFirstIndex, operation.name);

    default:
      throw new Error("Tipo de alocação do arquivo não conhecida");
  }
}

function contiguousDelete(disk: DiskFile[], firstIndex: number, filename: string) {
  for (let i = firstIndex; disk[i].name === filename; i++) {
    disk[i] = { name: "0" }
  }
  return disk
}

function chainedDelete(disk: DiskFile[], firstIndex: number, filename: string) {
  // !!! IMPLEMENTAR LOGICA DELEÇÃO ENCADEADA
  return disk
}

function indexedDelete(disk: DiskFile[], firstIndex: number, filename: string) {
  // !!! IMPLEMENTAR LOGICA DELEÇÃO INDEXADA
  return disk
}
