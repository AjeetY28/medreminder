package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = AccentTeal,
    secondary = MintGreen,
    tertiary = WarningAmber,
    background = SlateBlack,
    surface = DeepCharcoal,
    onBackground = TextWhite,
    onSurface = TextWhite,
    onPrimary = Color.Black,
    error = DangerRed
)

private val LightColorScheme = lightColorScheme(
    primary = AccentTeal,
    secondary = MintGreen,
    tertiary = WarningAmber,
    background = Color(0xF9FAFBFF),
    surface = Color.White,
    onBackground = Color(0xFF111827),
    onSurface = Color(0xFF1F2937),
    onPrimary = Color.White,
    error = DangerRed
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true, // Force dark theme by default for premium feel
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
