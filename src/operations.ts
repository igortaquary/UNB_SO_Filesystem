import { AllocationType, DiskFile, FileOperation, Process } from "./typings";
import { findObjectValueGte, sumObjectValues } from "./utils";

/* OPERAÇÕES DE CRIAÇÃO */
export function createFile(disk: DiskFile[], allocationType: AllocationType, process: Process, operation: FileOperation) {
  // Obtem os espaços livres no disco
  const freeDiskSpaces = getFreeDiskSpaces(disk)
  switch (allocationType) {
    case AllocationType.CONTIGUA:
      // Verifica se tem espaço continuo disponivel
      const availableIndex = findObjectValueGte( freeDiskSpaces, operation.size )
      if(availableIndex === undefined)
        throw new Error("Falta de espaço em disco para alocação contigua.");
      return contiguousCreate(disk, operation, availableIndex);

    case AllocationType.ENCADEADA:
      // Tamanho final do arquivo (somado com os 10%)
      const total_size = operation.size + Math.ceil(operation.size / 10);
      // Verifica se tem espaço total disponivel
      if( total_size > sumObjectValues( freeDiskSpaces ) ) 
        throw new Error("Falta de espaço em disco");

      return chainedCreate(disk, operation, total_size);

    case AllocationType.INDEXADA:
      // Verifica se tem espaço disponivel
      // size + 1 para espaço do bloco de indice
      if( (operation.size + 1) > sumObjectValues( freeDiskSpaces ) )
        throw new Error("Falta de espaço em disco");

      return indexedCreate(disk, operation);
  
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

function chainedCreate(disk: DiskFile[], operation: FileOperation, total_size: number) {
  for (let block = 0; block < total_size; block++) {
    const freeIndex = disk.findIndex( b => b.name === "0");
    const nextFreeIndex = block >= total_size - 1 ? 
      undefined : disk.findIndex( (b,i) => (b.name === "0" && i > freeIndex ))
    
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
  // Busca primeiro bloco livre
  const firstBlockIndex = disk.findIndex( b => b.name === "0");
  // Cria bloco de indice
  disk[firstBlockIndex] = {
    name: operation.name + "I",
    allocationType: AllocationType.INDEXADA,
    created_by: operation.process_id,
    blocksList: []
  }

  const blocksList = []
  // Cria blocos de dados
  for (let i = 0; i < operation.size; i++) {
    const freeIndex = disk.findIndex( b => b.name === "0");
    disk[freeIndex] = {
      name: operation.name,
      created_by: operation.process_id,
      allocationType: AllocationType.INDEXADA,
    }
    blocksList.push(freeIndex)
  }

  // Salva endereços dos blocos de dados no bloco de indice
  disk[firstBlockIndex].blocksList = blocksList
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
  if(fileFirstIndex === -1) throw new Error(`O arquivo ${operation.name} não foi encontrado para deleção`);
  const fileFirstBlock = disk[fileFirstIndex]

  // Verifica permissão para deletar arquivo
  if( process.priority !== 0 && (fileFirstBlock.created_by !== process.id ))
    throw new Error("O processo não tem permissão para deletar o arquivo");

  // Realiza deleção a depender do tipo de como o arquivo foi alocado
  switch (fileFirstBlock.allocationType) {
    case AllocationType.CONTIGUA:
      return contiguousDelete(disk, fileFirstIndex, operation.name);

    case AllocationType.ENCADEADA:
      return chainedDelete(disk, fileFirstIndex);

    case AllocationType.INDEXADA:
      return indexedDelete(disk, fileFirstIndex);

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

function chainedDelete(disk: DiskFile[], firstIndex: number) {
  let i = firstIndex
  while (i !== undefined) {
    const aux_i = i
    i = disk[i].nextBlock
    disk[aux_i] = { name: "0" }
  }
  return disk
}

function indexedDelete(disk: DiskFile[], firstIndex: number) {
  const index_block = disk[firstIndex]
  if(index_block.name.charAt(1) !== "I")
    throw new Error("Não é um bloco de indice");

  if(!index_block.blocksList)
    throw new Error("Bloco de indice não possui lista de blocos");
  
  // Apagar blocos de dados
  index_block.blocksList.forEach((block) => {
    disk[block] = { name: "0" }
  })

  // Apagar bloco de indice
  disk[firstIndex] = { name: "0" }
  
  return disk
}
