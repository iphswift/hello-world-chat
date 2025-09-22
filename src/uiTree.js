export function buildInitialUiTree() {
    return {
      tag: 'div', styleId: 'full-container',
      children: [
        { tag: 'div', styleId: 'chat-container', children: [] },
        {
            tag: 'div', styleId: 'input-container',
            children: [
              {
                tag: 'textarea', styleId: 'input-field',
                props: { placeholder: 'Type your message here...' },
                publishEvents: {
                  input: { // On 'input' DOM event
                    // This part is for the viewState payload
                    payload: { propToUpdate: 'value', valueFrom: 'target.value' }
                    // No `emit` here means no business logic fires on every key press
                  },
                  keypress: {
                    emit: 'ui:input-keypress',
                  }
                }
              },
              {
                tag: 'i', styleId: 'input-icon',
                props: { class: 'fa fa-arrow-right', 'aria-hidden': true },
                publishEvents: {
                  click: { // On 'click' DOM event
                    // This event is for the AppController
                    emit: 'ui:submit-request', 
                    // This part is for the viewState payload (though not strictly needed for a click)
                    payload: { propToUpdate: 'lastClicked', valueFrom: 'timeStamp' } 
                  }
                }
              }
            ]
          }
        ]
    };
  }