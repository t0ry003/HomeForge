from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, ProfileView, TopologyView, RoomViewSet, DeviceTypeViewSet, DeviceViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'device-types', DeviceTypeViewSet, basename='devicetype')
router.register(r'devices', DeviceViewSet, basename='device')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # Login
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', ProfileView.as_view(), name='profile'),
    path('topology/', TopologyView.as_view(), name='topology'),
    path('', include(router.urls)),
]