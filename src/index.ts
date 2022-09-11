/* 

*/
import fs from "fs";
import path from 'path';
import { FileOperation, Process, OldFile, OperationType, AllocationType } from "./typings";
import { findObjectValueGte, sumObjectValues } from "./utils";

async function main() {
  try {
    const processes_file = process.argv[2]
    const files_file = process.argv[3]
  
    if(!processes_file || !files_file) {
      throw new Error("Missing input files"); 
    }
    
    // Carrega os processos no array
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

function runOperations(disk: string[], processes: Process[], allocationType: number, operations: FileOperation[]) {

  operations.forEach( (operation, i) => {
    try {
      if(operation.type === OperationType.DELETE) {
        // Operação de deleção de arquivo
      } else if (operation.type === OperationType.CREATE) {
        // Operação de criação de arquivo
        if(allocationType === AllocationType.CONTIGUA) {
          // Verifica se tem espaço disponivel
          const availableIndex = findObjectValueGte( freeDiskSpaces(disk), operation.size )
          if(availableIndex === undefined) throw new Error("Falta de espaço em disco");
        } else {
          // Verifica se tem espaço disponivel
          if( operation.size > sumObjectValues( freeDiskSpaces(disk) ) ) throw new Error("Falta de espaço em disco");
        }
      } else {
        throw new Error("Tipo de operação desconhecida");
      }
    } catch (error) {
      printOperationResult(i, false, error)
    }
  })

}

function freeDiskSpaces(disk: string[]) {
  const result = {};
  let initialIndex = undefined;
  for (let index = 0; index < disk.length; index++) {
    const value = disk[index];
    if(value === "0") {
      if(initialIndex !== undefined) {
        result[initialIndex] += 1;
      } else {
        result[index] = 1;
        if(disk[index + 1] === "0") {
          initialIndex = index
        }
      }
    }
  }
  console.log(result)
  return result
}

// Mostra resultados das operações no console
function printOperationResult(index: number, success: boolean, cause = "") {
  console.log(`Operação ${index} - ${success ? "Sucesso" : "Falha"} \n${cause}\n`)
}

function initDisk(diskSize: number, initialFiles: OldFile[]) {
  const disk = new Array<string>(diskSize).fill('0')
  console.log("diskSize = " + diskSize)
  // Arquivos iniciais são alocados de forma contigua
  initialFiles.forEach( file => {
    const free_index = disk.findIndex( v => v === '0')
    if(free_index === -1 || (free_index+file.size) > diskSize) throw new Error("No space for initial allocation");
    disk.fill(file.name, file.position, file.position+file.size)
  })

  console.log("Initial disk state: ")
  console.log(disk)
  return disk
}

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
  console.log(processes)
  return processes;
}

function readFiles(filename: string) {
  const contentArr = txtInputFileToArray(filename)

  const allocationType = Number(contentArr[0]) // Tipo de alocação
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
  console.log(oldFiles)

  const filesToCreate: FileOperation[] = contentArr.slice(oldFilesQty + 3).map( line => {
    let [process_id, type, name, size] = line.split(",");
    return {
      process_id: Number(process_id),
      type: Number(type),
      name: name.trim(),
      size: Number(size) || null
    }
  })
  console.log(filesToCreate)
  const response = {
    allocationType,
    diskSize,
    oldFilesQty,
    oldFiles,
    filesToCreate
  }
  return response;
}

function txtInputFileToArray (filename: string) {
  const buffer = fs.readFileSync(path.resolve("./inputs/" + filename));
  const content = buffer.toString()
  return content.split(/\n/)
}

// Run main
main()