#!/bin/bash

echo "Building for Android..."

# Сборка проекта
quasar build -m capacitor -T android

# Копирование в Capacitor
npx cap sync android

# Открытие в Android Studio
npx cap open android

echo "Android build completed!"
