'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function NavMobile() {
    const [isMobile, setIsMobile] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768) // md breakpoint
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Hide on mobile chat pages and new post page (they have their own merged navbar)
    const isChatPage = pathname?.startsWith('/chats') || pathname?.startsWith('/chat/')
    const isNewPostPage = pathname?.startsWith('/post/new')
    if (isMobile && (isChatPage || isNewPostPage)) {
        return null
    }

    return (
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-center h-12 bg-black/80 backdrop-blur border-b border-white/10">
            <Link
                href="/feed"
                className="text-white text-lg font-bold tracking-wide hover:text-red-500 transition-colors"
                aria-label="Feed"
            >
                Xchange
            </Link>
        </div>
    )
}
