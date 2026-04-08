export const ALBUM_CONFIG = {
  totalStickers: 708,
  categories: [
    { id: 'wappen', name: 'Wappen & Verein', range: [1, 20] },
    { id: 'vorstand', name: 'Vorstand & Ehrenamt', range: [21, 60] },
    { id: 'herren1', name: '1. Herren', range: [61, 100] },
    { id: 'herren2', name: '2. Herren', range: [101, 140] },
    { id: 'herren3', name: '3. Herren', range: [141, 175] },
    { id: 'herren4', name: '4. Herren', range: [176, 205] },
    { id: 'alte-herren', name: 'Alte Herren', range: [206, 235] },
    { id: 'damen', name: 'Damen', range: [236, 270] },
    { id: 'a-jugend', name: 'A-Jugend', range: [271, 300] },
    { id: 'b-jugend', name: 'B-Jugend', range: [301, 335] },
    { id: 'c-jugend', name: 'C-Jugend', range: [336, 370] },
    { id: 'd-jugend', name: 'D-Jugend', range: [371, 405] },
    { id: 'e-jugend', name: 'E-Jugend', range: [406, 435] },
    { id: 'f-jugend', name: 'F-Jugend', range: [436, 460] },
    { id: 'g-jugend', name: 'G-Jugend', range: [461, 480] },
    { id: 'schiri', name: 'Schiedsrichter', range: [481, 500] },
    { id: 'handball', name: 'Handball', range: [501, 545] },
    { id: 'volleyball', name: 'Volleyball', range: [546, 575] },
    { id: 'tischtennis', name: 'Tischtennis', range: [576, 600] },
    { id: 'darts', name: 'Darts', range: [601, 625] },
    { id: 'turnen', name: 'Turnen & Fitness', range: [626, 655] },
    { id: 'cheerleader', name: 'Cheerleader', range: [656, 675] },
    { id: 'legenden', name: 'Legenden & Historie', range: [676, 708] },
  ],
}

export function getCategoryForSticker(number) {
  return ALBUM_CONFIG.categories.find(
    (category) => number >= category.range[0] && number <= category.range[1]
  )
}
