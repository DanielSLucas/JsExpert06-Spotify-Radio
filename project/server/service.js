import { join, extname } from 'node:path'
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { randomUUID } from 'node:crypto'
import { PassThrough, Writable } from 'node:stream';
import Throttle from 'throttle'
import streamsPromises from 'node:stream/promises';
import child_process from 'node:child_process';
import { once } from 'node:events';

import config from './config.js';
import { logger } from './util.js';

const { 
  dir: { publicDir }, 
  constants: { 
    fallbackBitRate,
    englishConversation,
    bitRateDivisor
  } 
} = config;

export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};    
  }

  createClientStream() {
    const id = randomUUID();
    const clientStream = new PassThrough();
    this.clientStreams.set(id, clientStream);

    return {
      id,
      clientStream,
    }
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  _executeSoxCommand(args) {
    return child_process.spawn('sox', args);
  }

  async getBitRate(song) {
    try {
      const args = [
        '--i', // info
        '-B', // bitrate
        song
      ];
      const {
        stderr, // tudo que é erro
        stdout, // tudo que é log
        stdin, // enviar dados com stream
      } = this._executeSoxCommand(args);

      await Promise.all([
        once(stderr, 'readable'),
        once(stdout, 'readable'),
      ]);
      const [success, error] = [stdout, stderr].map(stream => stream.read());

      if (error) return await Promise.reject(error);

      return success.toString().trim().replace(/k/, '000');
    } catch (error) {
      logger.error(`Deu ruim no bitrate: ${error}`);
      return fallbackBitRate;
    }
  }

  broadCast() {
    return new Writable({
      write: (chunk, enc, cb) => {
        for (const [id, stream] of this.clientStreams) {
          // se o cliente desconectou nao devemos mais mandar dados para ele
          if(stream.writableEnded) {
            this.clientStreams.delete(id);
            continue;
          }

          stream.write(chunk)
        }

        cb();
      }
    })
  }

  async startStream() {
    logger.info(`Starting with ${this.currentSong}`)
    const bitRate = 
      this.currentBitRate = await this.getBitRate(this.currentSong) / bitRateDivisor;
    const throttleTransform = this.throttleTransform = new Throttle(bitRate);
    const songReadable = this.currentReadable = this.createFileStream(this.currentSong);
    return streamsPromises.pipeline(
      songReadable,
      throttleTransform,
      this.broadCast()
    )
  }

  stopStream() {
    this.throttleTransform?.end?.();
  }

  createFileStream(filename) {
    return fs.createReadStream(filename)
  }

  async getFileInfo(file) {
    const fullFilePath = join(publicDir, file);
    
    // valida se existe, se não existir estoura um erro!
    await fsPromises.access(fullFilePath);

    const fileType = extname(fullFilePath);

    return {
      type: fileType,
      name: fullFilePath
    };
  }

  async getFileStream(file) {
    const {
      name,
      type,
    } = await this.getFileInfo(file);
    
    return {
      stream: this.createFileStream(name),
      type,
    }
  }
}