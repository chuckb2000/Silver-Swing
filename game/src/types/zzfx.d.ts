declare module 'zzfx' {
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    buildSamples: (...p: (number | undefined)[]) => number[];
  };
  export function zzfx(...p: (number | undefined)[]): AudioBufferSourceNode;
}
