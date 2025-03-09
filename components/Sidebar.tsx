import Link from 'next/link';

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-100 p-4 min-h-screen">
      <h2 className="text-xl font-bold mb-4">Inference Gateway</h2>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link href="/" className="block hover:bg-gray-200 p-2 rounded">Home</Link>
          </li>
          <li>
            <Link href="/getting-started" className="block hover:bg-gray-200 p-2 rounded">Getting Started</Link>
          </li>
          <li>
            <Link href="/configuration" className="block hover:bg-gray-200 p-2 rounded">Configuration</Link>
          </li>
          <li>
            <Link href="/providers" className="block hover:bg-gray-200 p-2 rounded">Providers</Link>
          </li>
          <li>
            <Link href="/api-reference" className="block hover:bg-gray-200 p-2 rounded">API Reference</Link>
          </li>
          <li>
            <Link href="/examples" className="block hover:bg-gray-200 p-2 rounded">Examples</Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
