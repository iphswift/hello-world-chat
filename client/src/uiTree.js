export function buildInitialUiTree() {
    return {
      tag: 'div',
      presentation: { className: 'full-container' },
      children: [
        { 
          tag: 'div', 
          presentation: { className: 'chat-container' },
          children: [] 
        },
        {
            tag: 'div', 
            presentation: { className: 'input-container' }, 
            children: [
              {
                tag: 'textarea',
                queryId: 'main-input-field',
                presentation: { className: 'input-field' },
                attributes: { placeholder: 'Type your message here...' }, 
                behavior: { 
                  eventHandlers: {
                    input: {
                      payload: { propToUpdate: 'value', valueFrom: 'target.value' }
                    },
                    keypress: {
                      emit: 'ui:input-keypress',
                    }
                  }
                }
              },
              {
                tag: 'i',
                presentation: { className: 'input-icon' },
                attributes: { class: 'fa fa-arrow-right', 'aria-hidden': true }, 
                behavior: {
                  targetQuery: { queryId: 'main-input-field' }, 
                  eventHandlers: {
                    click: {
                      emit: 'ui:submit-request', 
                      payload: { propToUpdate: 'lastClicked', valueFrom: 'timeStamp' } 
                    }
                  }
                }
              }
            ]
          }
        ]
    };
  }