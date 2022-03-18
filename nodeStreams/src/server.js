import http from 'http';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

// generetor function
function * run() {
  for (let i = 0; i <= 99; i++) {
    const data = {
      id: randomUUID(),
      name: `Item-${i}`
    }
    yield data
  }
}

async function handler(request, response) {
  const readable = new Readable({
    read() {
      for (const data of run()) {
        console.log('sending', data);
        this.push(JSON.stringify(data)+'\n');
      }

      // informa que os dados acabaram
      this.push(null);
    }
  });

  // conforme readable stream lê os dados eles são passados para response
  readable.pipe(response)
}

http.createServer(handler)
  .listen(3333)
  .on('listening', () => console.log("Server is running on port 3333"))