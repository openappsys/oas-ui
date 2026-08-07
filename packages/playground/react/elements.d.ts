declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'oas-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { type?: string; size?: string; variant?: string }, HTMLElement>
      'oas-form': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { onOasSubmit?: (e: Event) => void }
      'oas-form-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; name?: string; required?: boolean }, HTMLElement>
      'oas-input': React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement> & { name?: string }, HTMLElement>
    }
  }
}
