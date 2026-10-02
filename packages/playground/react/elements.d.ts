declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'oas-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          type?: string
          size?: string
          variant?: string
          loading?: boolean
          disabled?: boolean
        },
        HTMLElement
      >
      'oas-form': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          rules?: string
          inline?: boolean
          layout?: string
          onOasSubmit?: (e: Event) => void
          onOasValidateFail?: (e: Event) => void
        },
        HTMLElement
      >
      'oas-form-item': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          label?: string
          name?: string
          required?: boolean
        },
        HTMLElement
      >
      'oas-input': React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement> & {
          name?: string
          prefix?: string
          suffix?: string
          'prefix-text'?: string
          'suffix-text'?: string
          'prefix-icon'?: string
          'suffix-icon'?: string
          placeholder?: string
          required?: boolean
        },
        HTMLElement
      >
      'oas-select': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          options?: string
          value?: string
          placeholder?: string
          clearable?: boolean
        },
        HTMLElement
      >
      'oas-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          columns?: string
          data?: string
          'row-key'?: string
          onOasSortChange?: (e: Event) => void
          onOasRowClick?: (e: Event) => void
        },
        HTMLElement
      >
      'oas-message': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
      'oas-kanban': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          columns?: string
          cards?: string
          'swimlane-by'?: string
          onOasChange?: (e: Event) => void
          onOasColumnReorder?: (e: Event) => void
        },
        HTMLElement
      >
    }
  }
}
