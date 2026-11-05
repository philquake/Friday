const BUFFER_SIZE = 4096

class AudioCaptureProcessor extends AudioWorkletProcessor {
  buffer = new Float32Array(BUFFER_SIZE)
  offset = 0

  process(inputs, outputs) {
    const input = inputs[0]?.[0]
    if (input) {
      let inputOffset = 0
      while (inputOffset < input.length) {
        const length = Math.min(BUFFER_SIZE - this.offset, input.length - inputOffset)
        this.buffer.set(input.subarray(inputOffset, inputOffset + length), this.offset)
        this.offset += length
        inputOffset += length

        if (this.offset === BUFFER_SIZE) {
          const chunk = this.buffer
          this.buffer = new Float32Array(BUFFER_SIZE)
          this.offset = 0
          this.port.postMessage(chunk, [chunk.buffer])
        }
      }
    }

    for (const channel of outputs[0] ?? []) channel.fill(0)
    return true
  }
}

registerProcessor('friday-audio-capture', AudioCaptureProcessor)
