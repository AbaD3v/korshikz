type Listener = (chunk: string) => void;

export class StreamingBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(chunk: string) {
    this.listeners.forEach((l) => l(chunk));
  }
}
