import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "郑州东站应急疏散高保真仿真系统",
  description: "基于水害大面积晚点旅客滞留演练脚本的时间轴推演、三层站区态势与设备联动仿真。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
