import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js domyślnie blokuje żądania zasobów dev/HMR spoza "localhost" -
  // bez tego strona ładuje się pod lokalnym IP, ale JavaScript (hydracja,
  // np. losowanie pól PESEL) nigdy się nie uruchamia.
  allowedDevOrigins: ['192.168.11.73'],
}

export default nextConfig
