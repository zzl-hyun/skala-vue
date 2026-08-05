<template>
  <span ref="elementRef" :class="className" />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

/**
 * Vue Bits의 Count Up 예제를 현재 프로젝트에 맞게 구성한 숫자 애니메이션 컴포넌트
 * 목표 숫자를 props로 받아 spring 방식으로 자연스럽게 증가하거나 감소시킨다.
 * @see https://vue-bits.dev/text-animations/count-up
 */
const props = defineProps({
  to: {
    type: Number,
    required: true,
  },
  from: {
    type: Number,
    default: 0,
  },
  direction: {
    type: String,
    default: 'up',
    validator: (value) => ['up', 'down'].includes(value),
  },
  delay: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 2,
  },
  className: {
    type: String,
    default: '',
  },
  startWhen: {
    type: Boolean,
    default: true,
  },
  separator: {
    type: String,
    default: '',
  },
  onStart: {
    type: Function,
    default: undefined,
  },
  onEnd: {
    type: Function,
    default: undefined,
  },
})

const elementRef = useTemplateRef('elementRef')
const currentValue = ref(props.direction === 'down' ? props.to : props.from)
const isInView = ref(false)
const animationId = ref(null)
const hasStarted = ref(false)

let intersectionObserver
let delayTimer
let velocity = 0

const damping = computed(() => 20 + 40 * (1 / props.duration))
const stiffness = computed(() => 100 * (1 / props.duration))

const formatNumber = (value) => {
  const formattedNumber = Intl.NumberFormat('en-US', {
    useGrouping: Boolean(props.separator),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value.toFixed(0)))

  return props.separator ? formattedNumber.replace(/,/g, props.separator) : formattedNumber
}

const updateDisplay = () => {
  if (elementRef.value) {
    elementRef.value.textContent = formatNumber(currentValue.value)
  }
}

const finishAnimation = (target) => {
  currentValue.value = target
  updateDisplay()
  animationId.value = null
  props.onEnd?.()
}

const springAnimation = () => {
  const target = props.direction === 'down' ? props.from : props.to
  const displacement = target - currentValue.value
  const springForce = displacement * stiffness.value
  const dampingForce = velocity * damping.value
  const acceleration = springForce - dampingForce

  velocity += acceleration * 0.016
  currentValue.value += velocity * 0.016
  updateDisplay()

  if (Math.abs(displacement) > 0.01 || Math.abs(velocity) > 0.01) {
    animationId.value = window.requestAnimationFrame(springAnimation)
    return
  }

  finishAnimation(target)
}

const startAnimation = () => {
  if (hasStarted.value || !isInView.value || !props.startWhen) return

  hasStarted.value = true
  props.onStart?.()

  const target = props.direction === 'down' ? props.from : props.to
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishAnimation(target)
    return
  }

  window.clearTimeout(delayTimer)
  delayTimer = window.setTimeout(() => {
    velocity = 0
    animationId.value = window.requestAnimationFrame(springAnimation)
  }, props.delay * 1000)
}

const setupIntersectionObserver = () => {
  if (!elementRef.value) return

  // 화면에 보이는 시점부터 애니메이션을 시작해 불필요한 실행을 줄인다.
  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !isInView.value) {
        isInView.value = true
        startAnimation()
      }
    },
    { threshold: 0, rootMargin: '0px' },
  )

  intersectionObserver.observe(elementRef.value)
}

const cleanupAnimation = () => {
  window.clearTimeout(delayTimer)

  if (animationId.value) {
    window.cancelAnimationFrame(animationId.value)
    animationId.value = null
  }
}

watch(
  [() => props.from, () => props.to, () => props.direction],
  () => {
    // 온도 단위 변경처럼 목표값이 바뀌면 이전 동작을 정리하고 다시 시작한다.
    cleanupAnimation()
    currentValue.value = props.direction === 'down' ? props.to : props.from
    updateDisplay()
    hasStarted.value = false

    if (isInView.value) {
      startAnimation()
    }
  },
  { immediate: true },
)

watch(
  () => props.startWhen,
  () => {
    if (props.startWhen && isInView.value && !hasStarted.value) {
      startAnimation()
    }
  },
)

onMounted(() => {
  updateDisplay()
  setupIntersectionObserver()
})

onUnmounted(() => {
  cleanupAnimation()
  intersectionObserver?.disconnect()
})
</script>
