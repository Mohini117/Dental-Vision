package com.mathesislabs.dentalvision;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	public MainActivity() {
		registerPlugin(LocalInferencePlugin.class);
	}
}
