import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '打爆老板小游戏',
    template: '%s | 打爆老板小游戏',
  },
  description:
    '打爆老板小游戏 - 自定义老板形象，挑战全网排行榜，释放你的压力！',
  keywords: [
    '打爆老板',
    '小游戏',
    '解压游戏',
    '排行榜',
    '自定义',
  ],
  openGraph: {
    title: '打爆老板小游戏 | 释放压力的好玩游戏',
    description:
      '自定义老板形象，挑战全网排行榜，释放你的压力！支持自定义图片、多种音效、精美画面。',
    url: 'https://code.coze.cn',
    siteName: '打爆老板小游戏',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
