/* 
Trabalho de implementação de sistema de arquivos
Disciplina: Sistemas Operacionais
Professora: Aletéia Patrícia Favacho
Alunos:
- Eduardo Vaz Fagundes Rech - 180075161
- Gabriel Henrique Souza de Melo - 180136577
- Igor Laranja Borges Taquary - 180122231
*/
import fs from "fs";
import path from 'path';
import { createFile, deleteFile } from "./operations";
import { FileOperation, Process, OldFile, OperationType, AllocationType, DiskFile } from "./typings";

// Função principal
function main() {
  try {
    // Nomes dos arquivos carregados como parâmetros
    const processes_file = process.argv[2]
    const files_file = process.argv[3]
  
    if(!processes_file || !files_file) {
      throw new Error("Missing input files"); 
    }
    
    // Carrega os processos no array
    const processes = readProcesses(processes_file) 

    // Carrega as informações do disco e as operações de arquivos em array
    const { allocationType, diskSize, oldFiles, filesToCreate } = readFiles(files_file) 
    
    // Cria a estrutura do disco e aloca os arquivos iniciais
    const disk = initDisk(diskSize, oldFiles)

    // Executa as operações de arquivos
    runOperations(disk, processes, allocationType, filesToCreate)
  
    console.log("Success End")
  } catch (error) {
    console.log("ERROR: " + error.message || error)
  }
}

function runOperations(disk: DiskFile[], processes: Process[], allocationType: number, operations: FileOperation[]) {

  operations.forEach( (operation, i) => {
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
      // Mostra o erro em caso de Falha
      printOperationResult(i, false, error)
    }
    // Mostra o estado atual do disco
    printDisk(disk)
    console.log(".")
  })

}

// Mostra resultados das operações no console
function printOperationResult(index: number, success: boolean, desc = "") {
  console.log(`Operação ${index+1} - ${success ? "✅ Sucesso" : "❌ Falha"} \n${desc}`)
}

function printDisk(disk: DiskFile[]) {
  const str = disk.map( f => f.name ).toString()
  console.log(str)
}

function initDisk(diskSize: number, initialFiles: OldFile[]) {
  // Criação do array de disco, inicialmente preenchido com zeros
  const disk = new Array<DiskFile>(diskSize).fill({name:'0'})
  console.log("diskSize = " + diskSize)
  // Arquivos iniciais são alocados de forma contigua
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

// Função que recebe um arquivo txt de processos e 
// retorna um array de objetos "Process"
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
// Função que recebe um arquivo txt de operações de arquivo e 
// retorna o tipo de alocação, tamanho do disco,
// quantidade de arquivos iniciais, arquivos iniciais
// e um array de objetos "FileOperation"
function readFiles(filename: string) {
  const contentArr = txtInputFileToArray(filename)

  const allocationType: AllocationType = Number(contentArr[0]) // Tipo de alocação
  const diskSize = Number(contentArr[1])  // Tamanho do disco (qtd de blocos)
  const oldFilesQty = Number(contentArr[2])  // Numero de arquivos ja alocados em disco

  const oldFiles: OldFile[] = contentArr.slice(3, oldFilesQty + 3).map( line => {
    let [name, position, size] = line.split(",");
    return {
      name: name.trim(),
      position: Number(position),
      size: Number(size)
    }
  })

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

// Busca um arquivo .txt pelo nome e retorna um array com cada linha do arquivo
function txtInputFileToArray (filename: string) {
  const buffer = fs.readFileSync(path.resolve("./inputs/" + filename));
  const content = buffer.toString()
  return content.split(/\n/)
}

// Executa a main
main()