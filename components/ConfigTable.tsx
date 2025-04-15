'use client';

import React from 'react';

interface TableRow {
  variable: string;
  description: string;
  defaultValue: string;
}

interface ConfigTableProps {
  rows: TableRow[];
}

export const ConfigTable: React.FC<ConfigTableProps> = ({ rows }) => {
  return (
    <div className="my-6 w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[--color-table-header-bg]">
          <tr>
            <th className="border border-[--color-table-border] px-4 py-3 text-left font-bold text-[--color-secondary-foreground]">
              Variable
            </th>
            <th className="border border-[--color-table-border] px-4 py-3 text-left font-bold text-[--color-secondary-foreground]">
              Description
            </th>
            <th className="border border-[--color-table-border] px-4 py-3 text-left font-bold text-[--color-secondary-foreground]">
              Default
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[--color-table-border]">
          {rows.map((row, index) => (
            <tr
              key={index}
              className={
                index % 2 === 0 ? 'bg-[--color-table-row-even]' : 'bg-[--color-table-row-odd]'
              }
            >
              <td className="border border-[--color-table-border] px-4 py-3 font-mono text-[--color-primary]">
                {row.variable}
              </td>
              <td className="border border-[--color-table-border] px-4 py-3 text-[--color-text]">
                {row.description}
              </td>
              <td className="border border-[--color-table-border] px-4 py-3 font-mono text-[--color-text-light] dark:text-[--color-text-dark]">
                {row.defaultValue}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConfigTable;
