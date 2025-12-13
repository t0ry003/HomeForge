from rest_framework import generics, permissions
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer, UserSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.response import Response


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)  # Anyone may register
    serializer_class = RegisterSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile (avatar/role)."""
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_object(self):
        user = self.request.user
        # Ensure profile exists before returning
        if not hasattr(user, 'profile'):
            from .models import Profile
            Profile.objects.get_or_create(user=user)
        return user

    def put(self, request, *args, **kwargs):
        # Allow updating first/last name and uploading avatar through multipart form
        user = request.user
        data = request.data.copy()
        # Update basic user fields
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.save()

        # Handle avatar upload and role change on the related profile
        profile = getattr(user, 'profile', None)
        if profile is None:
            from .models import Profile
            profile, _ = Profile.objects.get_or_create(user=user)

        avatar = request.FILES.get('avatar')
        if avatar:
            profile.avatar = avatar

        role = data.get('role')
        if role:
            profile.role = role

        profile.save()

        return Response(UserSerializer(user, context={'request': request}).data, status=status.HTTP_200_OK)