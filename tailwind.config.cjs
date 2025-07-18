/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind CSS 将扫描这些文件以生成样式
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 这里可以添加或覆盖 Tailwind 的默认主题配置
      // 例如，自定义颜色、字体、间距等
      colors: {
        // 示例：定义一个自定义的 primary 颜色
        primary: {
          DEFAULT: "#667eea", // 默认主色
          foreground: "#ffffff", // 主色上的文字颜色
          50: "#f0f4ff",
          500: "#667eea",
          600: "#5a67d8",
          700: "#4c51bf",
        },
        // 可以根据需要添加更多自定义颜色
        // 例如，与 shadcn/ui 默认颜色保持一致
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [
    // 这里可以添加 Tailwind CSS 插件，例如 @tailwindcss/forms, @tailwindcss/typography 等
  ],
};
