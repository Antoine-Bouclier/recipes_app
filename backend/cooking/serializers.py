from rest_framework import serializers

from .models import CookingSession

MAX_TIMERS = 20


class TimerSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=64)
    step = serializers.IntegerField(allow_null=True, required=False, default=None)
    label = serializers.CharField(max_length=120, allow_blank=True, required=False, default="")
    duration = serializers.IntegerField(min_value=1, max_value=24 * 3600)
    end_at = serializers.IntegerField(allow_null=True, required=False, default=None)
    paused = serializers.BooleanField(required=False, default=False)
    remaining = serializers.IntegerField(allow_null=True, required=False, default=None, min_value=0)
    alerted = serializers.BooleanField(required=False, default=False)


class CookingSessionSerializer(serializers.ModelSerializer):
    checked_steps = serializers.ListField(child=serializers.IntegerField(), required=False)
    checked_ingredients = serializers.ListField(child=serializers.IntegerField(), required=False)
    timers = TimerSerializer(many=True, required=False)

    class Meta:
        model = CookingSession
        fields = (
            "recipe", "started_at", "updated_at", "checked_steps", "checked_ingredients", "timers", "servings",
        )
        read_only_fields = ("recipe", "started_at", "updated_at")

    def validate_timers(self, value):
        if len(value) > MAX_TIMERS:
            raise serializers.ValidationError(f"{MAX_TIMERS} minuteurs maximum.")
        return value

    def _keep_known_ids(self, ids, related):
        known = set(related.values_list("id", flat=True))
        return [i for i in dict.fromkeys(ids) if i in known]

    def update(self, instance, validated_data):
        recipe = instance.recipe
        if "checked_steps" in validated_data:
            instance.checked_steps = self._keep_known_ids(validated_data["checked_steps"], recipe.steps)
        if "checked_ingredients" in validated_data:
            instance.checked_ingredients = self._keep_known_ids(
                validated_data["checked_ingredients"], recipe.ingredients
            )
        if "timers" in validated_data:
            instance.timers = [dict(t) for t in validated_data["timers"]]
        if "servings" in validated_data:
            instance.servings = validated_data["servings"]
        instance.save()
        return instance
