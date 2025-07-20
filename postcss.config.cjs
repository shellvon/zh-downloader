module.exports = {
  // 使用数组写法以便为插件传递选项
  plugins: [
    require('postcss-import'),
    require('postcss-prefix-selector')({
      prefix: '[data-zhd]',
      includeFiles: [/src[\\\/]content[\\\/].*\.css$/, /content\.css$/],
      transform(prefix, selector, prefixedSelector, filePath) {
        // 保留全局变量与 keyframes
        if (
          selector.startsWith(':root') ||
          selector.startsWith('@') ||
          selector.includes('keyframes')
        ) {
          return selector
        }
        return `${prefix} ${selector}`
      },
    }),
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}
