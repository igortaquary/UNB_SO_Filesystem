
export type Process = {
  id: number,
  priority: number,
  process_time: number,
  operations: number
}

export enum OperationType {
  CREATE = 0,
  DELETE = 1
}

// <ID_Processo>, <Código_Operação>, <Nome_arquivo>, <se_operacaoCriar_numero_blocos>.
export type FileOperation = {
  process_id: number,
  type: OperationType,
  name: string,
  size?: number
}

// arquivo (a ser identificado por uma letra), número do primeiro bloco gravado, quantidade de blocos ocupados por este arquivo.
export type OldFile = {
  name: string,
  position: number,
  size: number
}

// 1-contígua, 2-encadeada ou 3-indexada
export enum AllocationType {
  CONTIGUA = 1,
  ENCADEADA = 2,
  INDEXADA = 3
}

export type DiskFile = {
  name: string,
  allocationType?: AllocationType,
  created_by?: number,
  nextBlock?: number // Usado apenas no caso de alocação encadeada
  blocksList?: number[] // Usado apenas no caso de aloacação indexada no bloco de índice.
}