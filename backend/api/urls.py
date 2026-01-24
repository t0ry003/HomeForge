from django.urls import path
from .views import (
    RegisterView, 
    ProfileView, 
    TopologyView,
    CustomDeviceTypeListCreateView,
    CustomDeviceTypeDetailView,
    AdminPendingDeviceTypeListView,
    AdminDeviceTypeReviewView,
    DeviceListCreateView,
    DeviceDetailView,
    DeviceStateUpdateView,
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
    
    # Admin Review Endpoints
    path('admin/device-types/pending/', AdminPendingDeviceTypeListView.as_view(), name='admin-device-types-pending'),
    path('admin/device-types/<int:pk>/<str:action>/', AdminDeviceTypeReviewView.as_view(), name='admin-device-types-review'), # action: approve or deny
    
    path('devices/', DeviceListCreateView.as_view(), name='device-list-create'),
    path('devices/<int:pk>/', DeviceDetailView.as_view(), name='device-detail'),
    path('devices/<int:pk>/state/', DeviceStateUpdateView.as_view(), name='device-state-update'),
    path('rooms/', RoomListCreateView.as_view(), name='room-list-create'),
    path('rooms/<int:pk>/', RoomDetailView.as_view(), name='room-detail'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
]