import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide on narrow screens to keep mobile cards short. */
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}

/**
 * Plain HTML table. On small screens CSS turns each row into a stacked card,
 * using `data-label` to show the column name next to each value.
 */
export function Table<T>({ columns, rows, rowKey, empty, onRowClick }: TableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`${c.className ?? ''} ${c.hideOnMobile ? 'hide-mobile' : ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'is-clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.header}
                  data-label={c.header}
                  className={`${c.className ?? ''} ${c.hideOnMobile ? 'hide-mobile' : ''}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
