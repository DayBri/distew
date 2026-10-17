import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { store } from '@/game/store'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/new-game',
    name: 'new-game',
    component: () => import(/* webpackChunkName: "new-game" */ '../views/CharacterSelect.vue'),
    meta: { newGame: true }
  },
  {
    path: '/new-game/:classId',
    name: 'design-character',
    component: () => import(/* webpackChunkName: "new-game" */ '../views/CharacterDesign.vue'),
    meta: { newGame: true }
  },
  {
    path: '/shop',
    name: 'shop',
    component: () => import(/* webpackChunkName: "shop" */ '../views/ShopView.vue'),
    meta: { requiresUnlock: 'shop' }
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  },
  {
    path: '/spinner',
    name: 'spinner',
    component: () => import(/* webpackChunkName: "spinner" */ '../views/Spinner.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

// Without a save you can only be in the new game flow, and with one you can't re-enter it
// (abandon the save first) so an existing game is never overwritten by accident.
router.beforeEach((to, from, next) => {
  const isNewGameRoute = to.matched.some(record => record.meta.newGame)
  if (!store.hasGame && !isNewGameRoute) return next({ name: 'new-game' })
  if (store.hasGame && isNewGameRoute) return next({ name: 'home' })

  const lockedRoute = to.matched.find(record => record.meta.requiresUnlock && !store.isUnlocked(record.meta.requiresUnlock))
  if (lockedRoute) return next({ name: 'home' })
  next()
})

export default router
