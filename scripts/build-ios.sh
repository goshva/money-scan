#!/bin/bash

echo "Building for iOS..."

# Сборка проекта
quasar build -m capacitor -T ios

# Копирование в Capacitor
npx cap sync ios

# Открытие в Xcode
npx cap open ios

echo "iOS build completed!"
