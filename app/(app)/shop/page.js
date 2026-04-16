import styles from './shop.module.css'

const SHOP_URL = 'https://stickerfreunde.shop/sv-dalum/'

export default function ShopPage() {
  return (
    <div className={styles.page}>
      <iframe
        className={styles.shopFrame}
        src={SHOP_URL}
        title="SV Dalum Shop"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="payment *"
      />
    </div>
  )
}
