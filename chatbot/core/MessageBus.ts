type Listener<T> = (payload: T) => void;

export class MessageBus<T> {
  private listeners = new Set<Listener<T>>();

  subscribe(listener: Listener<T>) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(payload: T) {
    this.listeners.forEach((l) => l(payload));
  }
}
