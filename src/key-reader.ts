import { SWFFile } from "swf-parser";
import {
  AbcFile,
  ExtendedBuffer,
  MethodBodyInfo,
  MultinameKind,
  MultinameKindQName,
  InstructionDisassembler,
  TraitTypes,
  TraitClass,
  TraitMethod,
} from "abc-disassembler";

export class KeyReader {
  public buffer: Buffer;
  private file: SWFFile;
  private abcFile?: AbcFile;
  private disassembler?: InstructionDisassembler;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.file = SWFFile.load(buffer);

    this.findBrawlhallaAir();
  }

  private findBrawlhallaAir(): boolean {
    for (const tag of this.file.tags) {
      if (tag.type == 72) {
        // DoABC
        this.buffer = tag.data as Buffer;
        this.abcFile = AbcFile.read(new ExtendedBuffer(tag.data)) as AbcFile;
        this.disassembler = new InstructionDisassembler(this.abcFile);

        return true;
      }
    }
    return false;
  }

  private findQName(name: string): number | false {
    if (!this.abcFile) {
      return false;
    }

    const multinames = this.abcFile.constant_pool.multiname;
    for (
      let multinameIndex = 0;
      multinameIndex < multinames.length;
      multinameIndex++
    ) {
      const multiname = multinames[multinameIndex];
      if (multiname.kind == MultinameKind.QName) {
        const qname = multiname.data as MultinameKindQName;
        if (qname.name == 0) {
          continue;
        }

        const qnameName = this.abcFile.constant_pool.string[qname.name - 1];

        if (qnameName == name) {
          return multinameIndex;
        }
      }
    }

    return false;
  }

  private findMethodBody(method: number): MethodBodyInfo | false {
    if (!this.abcFile) {
      return false;
    }

    for (const methodBody of this.abcFile.method_body) {
      if (methodBody.method == method) {
        return methodBody;
      }
    }

    return false;
  }

  private findRawDataInit(): number | false {
    return this.findQName("Init");
  }

  private findSWZScript(): number | false {
    if (!this.abcFile || !this.disassembler) {
      return false;
    }

    const scripts = this.abcFile.script;
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];

      const init = script.init;

      if (init == 0) {
        continue;
      }

      const initBody = this.findMethodBody(init);

      if (!initBody) {
        continue;
      }

      const instructions = this.disassembler.disassemble(initBody);

      for (const instruction of instructions) {
        if (
          instruction.name == "pushstring" &&
          instruction.params[0] == "Engine.swz"
        ) {
          return i;
        }
      }
    }

    return false;
  }

  private findSWZClass(): number | false {
    if (!this.abcFile) {
      return false;
    }

    const swzScript = this.findSWZScript();

    if (!swzScript) {
      return false;
    }

    const script = this.abcFile.script[swzScript];

    for (const trait of script.trait) {
      if (trait.kind == TraitTypes.Class) {
        const traitClass = trait.data as TraitClass;
        return traitClass.classi;
      }
    }

    return false;
  }

  public findDecryptionKey(): number | false {
    if (!this.abcFile || !this.disassembler) {
      return false;
    }

    const swzClass = this.findSWZClass();

    if (!swzClass) {
      return false;
    }

    const initQNameIndex = this.findRawDataInit();

    if (!initQNameIndex) {
      return false;
    }

    const initQName = this.abcFile.constant_pool.multiname[initQNameIndex];

    const classInfo = this.abcFile.class[swzClass];

    for (const trait of classInfo.traits) {
      if ((trait.kind & 0b1111) == TraitTypes.Method) {
        const methodData = trait.data as TraitMethod;

        const methodBody = this.findMethodBody(methodData.method);

        if (!methodBody) {
          continue;
        }

        const instructions = this.disassembler.disassemble(methodBody);

        for (let i = 0; i < instructions.length; i++) {
          const instruction = instructions[i];
          if (
            instruction.name == "callpropvoid" &&
            instruction.params[0] == initQName &&
            instruction.params[1] == 1
          ) {
            const previousInstruction = instructions[i - 1];
            if (previousInstruction.name != "pushuint") {
              continue;
            }

            return previousInstruction.params[0];
          }
        }
      }
    }

    return false;
  }
}
