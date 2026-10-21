import { toJpeg } from 'html-to-image'
import pptxgen from 'pptxgenjs'

const SLIDE_WIDTH = 13.333
const SLIDE_HEIGHT = 7.5

export async function exportSlidesToPptx(root: HTMLElement, onProgress: (current: number, total: number) => void) {
  const pages = Array.from(root.querySelectorAll<HTMLElement>('.slides-page'))
  if (!pages.length) throw new Error('No slides are available to export.')

  await document.fonts.ready
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img')).map((image) => {
    if (image.complete) return Promise.resolve()
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))

  const pptx = new pptxgen()
  pptx.defineLayout({ name: 'TEMANMU_WIDE', width: SLIDE_WIDTH, height: SLIDE_HEIGHT })
  pptx.layout = 'TEMANMU_WIDE'
  pptx.author = 'Albert & Einstein'
  pptx.subject = 'TemanMu township care pitch deck'
  pptx.title = 'TemanMu'

  root.classList.add('slides-exporting')
  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    for (const [index, page] of pages.entries()) {
      onProgress(index + 1, pages.length)
      const { width, height } = page.getBoundingClientRect()
      const image = await toJpeg(page, { backgroundColor: '#fef9ef', quality: 0.94, pixelRatio: 1.5 })
      const fit = Math.min(SLIDE_WIDTH / width, SLIDE_HEIGHT / height)
      const imageWidth = width * fit
      const imageHeight = height * fit
      const slide = pptx.addSlide()
      slide.background = { color: 'FEF9EF' }
      slide.addImage({ data: image, x: (SLIDE_WIDTH - imageWidth) / 2, y: (SLIDE_HEIGHT - imageHeight) / 2, w: imageWidth, h: imageHeight })
    }
    await pptx.writeFile({ fileName: 'TemanMu-pitch-deck.pptx', compression: true })
  } finally {
    root.classList.remove('slides-exporting')
  }
}
