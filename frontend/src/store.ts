import { configureStore } from '@reduxjs/toolkit'
// ...

const initialCurrentLocation = { lat: 0, lng: 0 };

const store = configureStore({
  reducer: {
    // posts: postsReducer,
    // comments: commentsReducer,
    // users: usersReducer,

    currentLocation: (state = initialCurrentLocation , action) => { 
      switch (action.type) {
        case 'UPDATE_LOCATION':
          return action.payload;
        default:
          return state;
      }
    },
  },
})

export type AppStore = typeof store

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
