/* 

*/
// Imports necessarios
import fs from "fs";
import path from 'path';
import { createFile, deleteFile } from "./operations";
import { FileOperation, Process, OldFile, OperationType, AllocationType, DiskFile } from "./typings";

// Funcao principal
function main() {
  // Checa possiveis erros
  try {

    // Parametros de execucao
    // Arquivos de processo
    const processes_file = process.argv[2]
    // Arquivo de lista de operacoes
    const files_file = process.argv[3]
  
    if(!processes_file || !files_file) {
      throw new Error("Missing input files"); 
    }
    
    // Carrega os processos no array no formato Process
    const processes = readProcesses(processes_file) 

    // Carrega as informações do disco e os arquivos em arrays
    const { allocationType, diskSize, oldFiles, filesToCreate } = readFiles(files_file) 
  
    const disk = initDisk(diskSize, oldFiles)

    runOperations(disk, processes, allocationType, filesToCreate)
  
    console.log("Success End")
  } catch (error) {
    console.log("ERROR: " + error.message || error)
  }
}

// Realiza iteracao para realizacao das operacoes
function runOperations(disk: DiskFile[], processes: Process[], allocationType: number, operations: FileOperation[]) {

  operations.forEach( (operation, i) => {
    // Manipulacao e tratamento dos erros
    try {
      // Busca processo que realizará operação
      const processIndex = processes.findIndex( p => p.id === operation.process_id)
      // Verifica se o processo existe na lista de processos
      if(processIndex === -1)
        throw new Error(`O processo ${operation.process_id} não existe.`);
      // Verifica se o processo ainda pode executar operações
      if(processes[processIndex].process_time <= 0) 
        throw new Error(`O processo ${operation.process_id} já encerrou a sua execução.`);
      
      // Processo executará operação (-1 tempo de processamento)
      processes[processIndex].process_time = processes[processIndex].process_time - 1;
      
      if(operation.type === OperationType.DELETE) {
        // Operação de deleção de arquivo
        disk = deleteFile(disk, processes[processIndex], operation)
        printOperationResult(i, true, `Arquivo ${operation.name} deletado pelo processo ${operation.process_id}`)
      } else if (operation.type === OperationType.CREATE) {
        // Operação de criação de arquivo
        disk = createFile(disk, allocationType, processes[processIndex], operation)
        printOperationResult(i, true, `Arquivo ${operation.name} criado pelo processo ${operation.process_id}`)
      } else {
        throw new Error("Tipo de operação desconhecida");
      }
    } catch (error) {
      // Informa o erro no monitor
      printOperationResult(i, false, error)
    }
    printDisk(disk)
    console.log(".")
  })

}

// Mostra resultados das operações no console
function printOperationResult(index: number, success: boolean, desc = "") {
  console.log(`Operação ${index+1} - ${success ? "✅ Sucesso" : "❌ Falha"} \n${desc}`)
}

// Mostra o estado atual do disco
function printDisk(disk: DiskFile[]) {
  const str = disk.map( f => f.name ).toString()
  console.log(str)
}

// Inicializa o vetor que representa o disco
function initDisk(diskSize: number, initialFiles: OldFile[]) {
  const disk = new Array<DiskFile>(diskSize).fill({name:'0'})
  console.log("diskSize = " + diskSize)
  // Arquivos iniciais são alocados de forma contigua
  // Preenche o vetor do disco com os arquivos iniciais
  initialFiles.forEach( file => {
    const free_index = disk.findIndex( v => v.name === '0')
    if(free_index === -1 || (free_index+file.size) > diskSize) throw new Error("No space for initial allocation");
    disk.fill({ name: file.name, allocationType: AllocationType.CONTIGUA }, file.position, file.position+file.size)
  })

  console.log("Initial disk state: ")
  printDisk(disk)
  console.log("\n")
  return disk
}

// Le cada linha do arquivo de processos e salva no array de tipo Process
function readProcesses(filename: string) {
  const contentArr = txtInputFileToArray(filename)
  const processes: Process[] = contentArr.map( line => {
    let [id, priority, process_time] = line.split(",");
    return {
      id: Number(id),
      priority: Number(priority),
      process_time: Number(process_time),
      operations: 0
    }
  })
  return processes;
}

// Le arquivo de lista de operacoes
function readFiles(filename: string) {
  const contentArr = txtInputFileToArray(filename)

  const allocationType: AllocationType = Number(contentArr[0]) // Tipo de alocação
  const diskSize = Number(contentArr[1])  // Tamanho do disco (qtd de blocos)
  const oldFilesQty = Number(contentArr[2])  // Numero de arquivos ja alocados em disco

  // Leitura das linhas que indicam os arquivos iniciais
  const oldFiles: OldFile[] = contentArr.slice(3, oldFilesQty + 3).map( line => {
    let [name, position, size] = line.split(",");
    return {
      name: name.trim(),
      position: Number(position),
      size: Number(size)
    }
  })

  // Leitura das linhas que indicam as operacoes de arquivos a serem realizadas
  const filesToCreate: FileOperation[] = contentArr.slice(oldFilesQty + 3).map( line => {
    let [process_id, type, name, size] = line.split(",");
    return {
      process_id: Number(process_id),
      type: Number(type),
      name: name.trim(),
      size: Number(size) || null
    }
  })
  const response = {
    allocationType,
    diskSize,
    oldFilesQty,
    oldFiles,
    filesToCreate
  }
  return response;
}

// Separa o arquivo em linhas e retorna um vetor
function txtInputFileToArray (filename: string) {
  const buffer = fs.readFileSync(path.resolve("./inputs/" + filename));
  const content = buffer.toString()
  return content.split(/\n/)
}

// Run main
main()