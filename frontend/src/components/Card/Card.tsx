import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

/**
 * Card: içerikleri gruplayan beyaz, köşeleri yuvarlatılmış kutu.
 * Dashboard panelleri, hesap kartları, formlar vb. için temel kapsayıcı.
 *
 * Alt parçalar (hepsi opsiyonel kullanılır):
 *  - CardHeader  : üst bölüm (başlık alanı)
 *  - CardTitle   : başlık metni
 *  - CardContent : asıl içerik
 *  - CardFooter  : alt bölüm (aksiyon butonları vb.)
 */
export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 p-5 pb-0', className)}
      {...props}
    />
  )
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-gray-900', className)}
      {...props}
    />
  )
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 p-5 pt-0', className)}
      {...props}
    />
  )
}
