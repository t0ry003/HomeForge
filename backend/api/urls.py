from django.urls import path
from .views import (
    RegisterView, 
    ProfileView, 
    TopologyView,
    CustomDeviceTypeListCreateView,
    CustomDeviceTypeDetailView,
    DeviceTypeApproveView,
    DeviceListCreateView,
    DeviceDetailView,
    DeviceTypeProposeView,
    RoomListCreateView,
    RoomDetailView,
    UserListView,
    UserDetailView
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # Login
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', ProfileView.as_view(), name='profile'),
    path('topology/', TopologyView.as_view(), name='topology'),
    path('device-types/', CustomDeviceTypeListCreateView.as_view(), name='device-types-list'),
    path('device-types/propose/', DeviceTypeProposeView.as_view(), name='device-types-propose'),
    path('device-types/<int:pk>/', CustomDeviceTypeDetailView.as_view(), name='device-types-detail'),
    path('device-types/<int:pk>/approve/', DeviceTypeApproveView.as_view(), name='device-types-approve'),
    path('devices/', DeviceListCreateView.as_view(), name='device-list-create'),
    path('devices/<int:pk>/', DeviceDetailView.as_view(), name='device-detail'),
    path('rooms/', RoomListCreateView.as_view(), name='room-list-create'),
    path('rooms/<int:pk>/', RoomDetailView.as_view(), name='room-detail'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
]