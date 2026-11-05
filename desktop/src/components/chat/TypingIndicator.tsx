import { memo } from 'react'
import { orbColor } from '../../core/orbColors'

const THINKING_COLOR = orbColor('thinking')

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-[3px]" style={{ height: '1em' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="inline-block w-[4px] h-[4px] rounded-full animate-bounce-dot"
          style={{ background: THINKING_COLOR, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
})
