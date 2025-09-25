/**
 * A simple publish-subscribe system.
 */
class EventBus {
    constructor() {
      this.listeners = {};
    }
  
    /**
     * Subscribes a callback to an event.
     * @param {string} event - The name of the event to listen for.
     * @param {Function} callback - The function to execute when the event is emitted.
     */
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }
  
    /**
     * Unsubscribes a callback from an event.
     * @param {string} event - The name of the event.
     * @param {Function} callback - The specific callback to remove.
     */
    off(event, callback) {
      if (!this.listeners[event]) return;
  
      this.listeners[event] = this.listeners[event].filter(
        listener => listener !== callback
      );
    }
  
    /**
     * Publishes an event to all subscribed listeners.
     * @param {string} event - The name of the event to emit.
     * @param {*} data - The data to pass to the event listeners.
     */
    emit(event, data) {
      if (!this.listeners[event]) return;
  
      this.listeners[event].forEach(listener => {
        try{
          listener(data)
        } catch (ex) { 
          console.error("Unhandled error in listener!", ex)
        }
      });
    }
  }
  
  // Export a singleton instance so all components share the same bus.
  export const eventBus = new EventBus();