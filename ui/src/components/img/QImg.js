import { h, defineComponent, ref, computed, watch, onBeforeUnmount, Transition } from 'vue'

import QSpinner from '../spinner/QSpinner.js'

import useRatio, { useRatioProps } from '../../composables/private/use-ratio.js'

import { hSlot } from '../../utils/render.js'

const crossoriginValues = [ 'anonymous', 'use-credentials' ]
const loadingValues = [ 'eager', 'lazy' ]
const fitValues = [ 'cover', 'fill', 'contain', 'none', 'scale-down' ]

export default defineComponent({
  name: 'QImg',

  props: {
    ...useRatioProps,

    src: String,
    srcset: String,
    sizes: String,
    alt: String,
    crossorigin: {
      type: String,
      validator: val => crossoriginValues.includes(val)
    },
    loading: {
      type: String,
      default: 'lazy',
      validator: val => loadingValues.includes(val)
    },
    width: String,
    height: String,

    placeholderSrc: String,

    fit: {
      type: String,
      default: 'cover',
      validator: val => fitValues.includes(val)
    },
    position: {
      type: String,
      default: '50% 50%'
    },

    imgClass: [ Array, String, Object ],
    imgStyle: Object,

    noSpinner: Boolean,
    noNativeMenu: Boolean,

    spinnerColor: String,
    spinnerSize: String
  },

  emits: [ 'load', 'error' ],

  setup (props, { slots, emit }) {
    const naturalRatio = ref(0.5)
    const ratioStyle = useRatio(props, naturalRatio)

    let loadTimer

    const images = [
      ref(null),
      ref(props.placeholderSrc !== void 0 ? { src: props.placeholderSrc } : null)
    ]

    const position = ref(0)
    const imgRef = ref(null)

    const isLoading = ref(false)
    const hasError = ref(false)

    const classes = computed(() =>
      `q-img q-img--${ props.noNativeMenu === true ? 'no-' : '' }menu`
    )

    const style = computed(() => ({
      width: props.width,
      height: props.height
    }))

    const imgStyle = computed(() => ({
      ...props.imgStyle,
      objectFit: props.fit,
      objectPosition: props.position
    }))

    watch(() => getCurrentSrc(), addImage)

    function getCurrentSrc () {
      return props.src || props.srcset || props.sizes
        ? {
            src: props.src,
            srcset: props.srcset,
            sizes: props.sizes
          }
        : null
    }

    function addImage (imgProps) {
      clearTimeout(loadTimer)
      hasError.value = false

      if (imgProps === null) {
        isLoading.value = false
        images[ 0 ].value = null
        images[ 1 ].value = null
        return
      }

      isLoading.value = true
      images[ position.value ].value = imgProps
    }

    function onLoad () {
      const img = imgRef.value

      naturalRatio.value = img.naturalHeight === 0
        ? 0.5
        : img.naturalWidth / img.naturalHeight

      waitForCompleteness()
    }

    function waitForCompleteness () {
      const img = imgRef.value

      if (img.complete === true) {
        onReady(img)
      }
      else {
        loadTimer = setTimeout(waitForCompleteness, 50)
      }
    }

    function onReady (img) {
      position.value = position.value === 1 ? 0 : 1
      images[ position.value ].value = null
      isLoading.value = false
      hasError.value = false
      emit('load', img.currentSrc || img.src)
    }

    function onError (err) {
      clearTimeout(loadTimer)
      isLoading.value = false
      hasError.value = true
      images[ 0 ].value = null
      images[ 1 ].value = null
      emit('error', err)
    }

    function getContainer (key, child) {
      return h(
        'div',
        { class: 'q-img__container absolute-full', key },
        child
      )
    }

    function getImage (index) {
      const img = images[ index ].value

      const data = {
        class: 'q-img__image',
        style: imgStyle.value,
        crossorigin: props.crossorigin,
        height: props.height,
        width: props.width,
        loading: props.loading,
        'aria-hidden': 'true',
        ...img
      }

      if (position.value === index) {
        data.class += ' q-img__image--waiting'
        Object.assign(data, { ref: imgRef, onLoad, onError })
      }
      else {
        data.class += ' q-img__image--loaded'
      }

      return getContainer('img' + index, h('img', data))
    }

    function getContent () {
      if (isLoading.value !== true) {
        return h('div', {
          key: 'content',
          class: 'q-img__content absolute-full'
        }, hSlot(slots[ hasError.value === true ? 'error' : 'default' ]))
      }

      return h('div', {
        key: 'loading',
        class: 'q-img__loading absolute-full flex flex-center'
      }, (
        slots.loading !== void 0
          ? slots.loading()
          : (
              props.noSpinner === true
                ? void 0
                : [
                    h(QSpinner, {
                      color: props.spinnerColor,
                      size: props.spinnerSize
                    })
                  ]
            )
      ))
    }

    addImage(getCurrentSrc())

    onBeforeUnmount(() => {
      clearTimeout(loadTimer)
    })

    return () => {
      const content = []

      if (ratioStyle.value !== null) {
        content.push(
          h('div', { key: 'filler', style: ratioStyle.value })
        )
      }

      if (hasError.value !== true) {
        if (images[ 0 ].value !== null) {
          content.push(getImage(0))
        }

        if (images[ 1 ].value !== null) {
          content.push(getImage(1))
        }
      }

      content.push(
        h(Transition, { name: 'q-transition--fade', appear: true }, getContent)
      )

      return h('div', {
        class: classes.value,
        style: style.value,
        role: 'img',
        'aria-label': props.alt
      }, content)
    }
  }
})
