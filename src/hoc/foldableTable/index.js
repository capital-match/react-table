/* eslint-disable */

import React from 'react'
import left from './left.svg'
import right from './right.svg'

const defaultFoldIconComponent = ({ collapsed }) => {
  const style = { width: 25 }

  if (collapsed) return <img src={right} style={style} alt="right" />
  return <img src={left} style={style} alt="left" />
}

const defaultFoldButtonComponent = ({ header, collapsed, icon, onClick }) => {
  const style = {
    marginLeft: '0px',
    marginTop: '-5px',
    marginBottom: '-8px',
    float: 'left',
    cursor: 'pointer',
  }

  return (
    <div>
      <div style={style} onClick={onClick}>
        {icon}
      </div>
      {!collapsed && <div>{header}</div>}
    </div>
  )
}

export default ReactTable => {
  const wrapper = class RTFoldableTable extends React.Component {
    constructor(props, context) {
      super(props, context)

      this.state = {
        folded: props.onFoldChange ? undefined : {},
        resized: props.resized || [],
      }
    }

    UNSAFE_componentWillReceiveProps(newProps) {
      if (this.state.resized !== newProps.resized) {
        this.setState(p => ({ resized: newProps.resized }))
      }
    }

    onResizedChange = resized => {
      const { onResizedChange } = this.props
      if (onResizedChange) onResizedChange(resized)
      else {
        this.setState(p => ({ resized }))
      }
    }

    removeResized = column => {
      const { id } = column
      if (!id) return

      const { resized } = this.state
      if (!resized) return

      const rs = resized.find(r => r.id === id)
      if (!rs) return

      const newResized = resized.filter(r => r !== rs)
      this.onResizedChange(newResized)
    }

    // this is so we can expose the underlying ReactTable.
    getWrappedInstance = () => {
      if (!this.wrappedInstance) console.warn('RTFoldableTable - No wrapped instance')
      if (this.wrappedInstance.getWrappedInstance) return this.wrappedInstance.getWrappedInstance()
      return this.wrappedInstance
    }

    getCopiedKey = key => {
      const { foldableOriginalKey } = this.props
      return `${foldableOriginalKey}${key}`
    }

    copyOriginals = column => {
      const { FoldedColumn } = this.props

      // Stop copy if the column already copied
      if (column.original_Header) return

      Object.keys(FoldedColumn).forEach(k => {
        const copiedKey = this.getCopiedKey(k)

        if (k === 'Cell') column[copiedKey] = column[k] ? column[k] : c => c.value
        else column[copiedKey] = column[k]
      })

      // Copy sub Columns
      if (column.columns && !column.original_Columns) column.original_Columns = column.columns

      // Copy Header
      if (!column.original_Header) column.original_Header = column.Header
    }

    restoreToOriginal = column => {
      const { FoldedColumn } = this.props

      Object.keys(FoldedColumn).forEach(k => {
        // ignore header as handling by foldableHeaderRender
        if (k === 'Header') return

        const copiedKey = this.getCopiedKey(k)
        column[k] = column[copiedKey]
      })

      if (column.columns && column.original_Columns) column.columns = column.original_Columns
    }

    getState = () => (this.props.onFoldChange ? this.props.folded : this.state.folded)

    isFolded = col => {
      const folded = this.getState()
      return folded[col.id] === true
    }

    foldingHandler = col => {
      if (!col || !col.id) return

      const { onFoldChange } = this.props
      const folded = this.getState()
      const { id } = col

      const newFold = Object.assign({}, folded)
      newFold[id] = !newFold[id]

      // Remove the Resized if have
      this.removeResized(col)

      if (onFoldChange) onFoldChange(newFold)
      else {
        this.setState(previous => ({ folded: newFold }))
      }
    }

    foldableHeaderRender = cell => {
      const { FoldButtonComponent, FoldIconComponent } = this.props
      const { column } = cell
      const collapsed = this.isFolded(column)
      const icon = React.createElement(FoldIconComponent, { collapsed })
      const onClick = () => this.foldingHandler(column)

      return React.createElement(FoldButtonComponent, {
        header: column.original_Header,
        collapsed,
        icon,
        onClick,
      })
    }

    applyFoldableForColumn = column => {
      const collapsed = this.isFolded(column)
      const { FoldedColumn } = this.props

      // Handle Column Header
      if (column.columns) {
        if (collapsed) {
          column.columns = [FoldedColumn]
          column.width = FoldedColumn.width
          column.style = FoldedColumn.style
        } else this.restoreToOriginal(column)
      }
      // Handle Normal Column.
      else if (collapsed) column = Object.assign(column, FoldedColumn)
      else {
        this.restoreToOriginal(column)
      }
    }

    applyFoldableForColumns = columns =>
      columns.map((col, index) => {
        if (!col.foldable) return col

        // If col don't have id then generate id based on index
        if (!col.id) col.id = `col_${index}`

        this.copyOriginals(col)
        // Replace current header with internal header render.
        col.Header = c => this.foldableHeaderRender(c)
        // apply foldable
        this.applyFoldableForColumn(col)

        // return the new column out
        return col
      })

    render() {
      const {
        columns: originalCols,
        FoldButtonComponent,
        FoldIconComponent,
        FoldedColumn,
        ...rest
      } = this.props
      const columns = this.applyFoldableForColumns([...originalCols])

      const extra = {
        columns,
        onResizedChange: this.onResizedChange,
        resized: this.state.resized,
      }

      return <ReactTable {...rest} {...extra} ref={r => (this.wrappedInstance = r)} />
    }
  }

  wrapper.displayName = 'RTFoldableTable'
  wrapper.defaultProps = {
    FoldIconComponent: defaultFoldIconComponent,
    FoldButtonComponent: defaultFoldButtonComponent,
    foldableOriginalKey: 'original_',
    FoldedColumn: {
      Cell: c => '',
      width: 30,
      sortable: false,
      resizable: false,
      filterable: false,
    },
  }

  return wrapper
}
