import { createApp } from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'

import user, { $user } from '@/services/user'
import { auth } from '@/firebase'
import { authPromise } from '@/services/deferredPromises'

auth.onAuthStateChanged(user => {
    $user.send({
        type: 'CHANGED',
        user
    })
    authPromise.resolve(user)
})

let signInSuccessRedirect = '/'
$user.service.onTransition(state => {
    if (router.currentRoute.value.name) {
        if (
            state.matches('authenticated') &&
            router.currentRoute.value.name === 'Signin'
        ) {
            router.replace(signInSuccessRedirect)
        } else if (
            // if signed out on an authenticated page, save route and redirect
            state.matches('no_user') &&
            router.currentRoute.value.matched.some(record => record.meta.requiresAuth)
        ) {
            router.push('/welcome')
        }
    }
})

router.beforeEach(async (to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        await authPromise
        if ($user.state.value.matches('no_user') && to.name !== 'Signin') {
            if (to.name !== 'Home' || from.name === 'Welcome') {
                signInSuccessRedirect = to
                return next('/signin')
            } else {
                return next('/welcome')
            }
        } else if ($user.state.value.matches('authenticated') && to.name === 'Signin') {
            return next('/')
        }
    }
    next()
})

createApp(App)
    .use(store)
    .use(router)
    .use(user)
    .mount('#app')
